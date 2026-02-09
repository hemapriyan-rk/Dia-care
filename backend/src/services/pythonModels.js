import { spawn, spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PYTHON_DIR = path.join(__dirname, '../..', '..', 'Code');
const JSON_DIR = path.join(PYTHON_DIR, 'Json');

console.log('Python Models Service initialized');
console.log('Python directory:', PYTHON_DIR);
console.log('JSON directory:', JSON_DIR);

/**
 * Get the Python executable from virtual environment or system
 * @returns {string} - Path to python executable
 */
function getPythonExecutable() {
    // Try to find python in .venv first
    const venvPaths = [
        path.join(__dirname, '../../.venv/bin/python3'),
        path.join(__dirname, '../../.venv/bin/python'),
        path.join(process.cwd(), '.venv/bin/python3'),
        path.join(process.cwd(), '.venv/bin/python'),
        '/home/fang/Downloads/DevSOC-Dia-Care/.venv/bin/python3'
    ];

    for (const pythonPath of venvPaths) {
        if (fs.existsSync(pythonPath)) {
            console.log(`[Python] Using virtual environment Python: ${pythonPath}`);
            return pythonPath;
        }
    }

    // Fallback to system python
    const systemPython = process.platform === 'win32' ? 'python' : 'python3';
    console.log(`[Python] Using system Python: ${systemPython}`);
    return systemPython;
}

/**
 * Run a Python script and return the result
 * @param {string} scriptPath - Full path to Python script
 * @param {number} timeoutMs - Timeout in milliseconds (default 30s)
 * @returns {Promise<object>} - Script output
 */
function runPythonScript(scriptPath, timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
        // Get the appropriate Python executable
        const pythonExe = getPythonExecutable();

        console.log(`[Python Models] Executing: ${scriptPath}`);
        const python = spawn(pythonExe, [scriptPath], {
            cwd: PYTHON_DIR,
            timeout: timeoutMs,
            env: process.env,
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        python.stdout.on('data', (data) => {
            stdout += data.toString();
            console.log(`[Python stdout] ${data.toString().trim()}`);
        });

        python.stderr.on('data', (data) => {
            stderr += data.toString();
            console.error(`[Python stderr] ${data.toString().trim()}`);
        });

        python.on('error', (error) => {
            reject(new Error(`Failed to execute Python script: ${error.message}`));
        });

        python.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Python script failed with code ${code}: ${stderr}`));
            } else {
                resolve({ stdout, stderr });
            }
        });

        // Timeout handler
        setTimeout(() => {
            python.kill();
            reject(new Error(`Python script timeout after ${timeoutMs}ms`));
        }, timeoutMs);
    });
}

/**
 * Read JSON output file from Python script
 * @param {string} filename - Name of JSON file in Json/ directory
 * @returns {object} - Parsed JSON data
 */
function readJsonOutput(filename) {
    const filepath = path.join(JSON_DIR, filename);

    // Wait for file to exist (Python script might take a moment)
    for (let i = 0; i < 10; i++) {
        if (fs.existsSync(filepath)) {
            try {
                const content = fs.readFileSync(filepath, 'utf-8');
                return JSON.parse(content);
            } catch (err) {
                if (i < 9) {
                    // Wait a bit and retry
                    require('child_process').execSync('sleep 0.1');
                    continue;
                }
                throw err;
            }
        }
        if (i < 9) {
            require('child_process').execSync('sleep 0.1');
        }
    }

    throw new Error(`Output file not found: ${filepath}`);
}

/**
 * Write JSON input file for Python scripts
 * @param {string} filename - Name of JSON file to write
 * @param {object} data - Data to write
 */
function writeJsonInput(filename, data) {
    const filepath = path.join(JSON_DIR, filename);

    // Ensure directory exists
    if (!fs.existsSync(JSON_DIR)) {
        fs.mkdirSync(JSON_DIR, { recursive: true });
    }

    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`[Python Models] Wrote input: ${filepath}`);
}

/**
 * Invoke Local Model
 * Tracks user's personal patterns with adaptive baseline
 * 
 * @param {object} dailyData - Current day's behavioral data
 * @param {object} baseline - User's baseline metrics
 * @param {object} previousState - Previous local model state (optional)
 * @returns {Promise<object>} - Local model output
 */
export async function invokeLocalModel(dailyData, baseline, previousState = null) {
    try {
        console.log('[Local Model] Starting inference...');

        // Prepare input
        const localInput = {
            sleep_midpoint_min: dailyData.sleep_midpoint_min,
            sleep_duration_min: dailyData.sleep_duration_min,
            mean_med_time_min: dailyData.mean_med_time_min || baseline.avg_activity_duration_min,
            activity_load: dailyData.activity_load || 0,
            baseline: {
                sleep_midpoint_min: baseline.avg_sleep_midpoint_min || 360,
                sleep_duration_min: baseline.avg_sleep_duration_min || 480,
                mean_med_time_min: baseline.mean_med_time_min || 720,
                activity_load: (baseline.avg_activity_duration_min || 0) * (baseline.avg_activity_MET || 1),
            },
            previous_state: previousState || {
                days_observed: 0,
                baseline: null,
                cumulative_deviation: 0.0,
                history: []
            }
        };

        writeJsonInput('local_input.json', localInput);

        // Run local.py
        const localScriptPath = path.join(PYTHON_DIR, 'Local Layer', 'local.py');
        await runPythonScript(localScriptPath);

        // Read output
        const localOutput = readJsonOutput('local_output.json');
        console.log('[Local Model] Output:', localOutput);

        return localOutput;
    } catch (error) {
        console.error('[Local Model] Error:', error);
        throw error;
    }
}

/**
 * Invoke Global Model
 * Uses population-level LightGBM model for glucose deviation prediction
 * 
 * @param {object} dailyData - Current day's behavioral data
 * @param {object} userProfile - User profile with demographics
 * @returns {Promise<object>} - Global model output
 */
export async function invokeGlobalModel(dailyData, userProfile) {
    try {
        console.log('[Global Model] Starting inference...');

        // Prepare input
        const globalInput = {
            age: userProfile.age || 50,
            sex: userProfile.sex === 'M' ? 1 : 0,
            sleep_midpoint_min: dailyData.sleep_midpoint_min || 360,
            sleep_duration_min: dailyData.sleep_duration_min || 480,
            dose_count: dailyData.dose_count || 0,
            mean_med_time_min: dailyData.mean_med_time_min || 0,
            activity_duration_min: dailyData.activity_duration_min || 0,
            activity_MET: dailyData.activity_MET || 1.0,
            activity_load: dailyData.activity_load || 0,
        };

        writeJsonInput('user_input.json', globalInput);

        // Run global_infer.py
        const globalScriptPath = path.join(PYTHON_DIR, 'global_infer.py');
        await runPythonScript(globalScriptPath);

        // Read output
        const globalOutput = readJsonOutput('global_inference_output.json');
        console.log('[Global Model] Output:', globalOutput);

        return globalOutput;
    } catch (error) {
        console.error('[Global Model] Error:', error);
        throw error;
    }
}

/**
 * Invoke Final Layer Model
 * Combines global and local predictions with time-dependent weighting
 * 
 * @param {object} globalOutput - Output from global model
 * @param {object} localOutput - Output from local model
 * @param {number} accountAgeDays - Days since account creation
 * @returns {Promise<object>} - Final combined prediction
 */
export async function invokeFinalModel(globalOutput, localOutput, accountAgeDays) {
    try {
        console.log('[Final Layer] Starting combination...');

        // Prepare input
        const finalInput = {
            global_inference_output: globalOutput,
            local_output: localOutput,
            account_age: {
                days_since_account_creation: accountAgeDays || 0,
                user_id: 'unknown'
            }
        };

        // Write inputs for final.py
        writeJsonInput('global_inference_output.json', globalOutput);
        writeJsonInput('local_output.json', localOutput);
        writeJsonInput('account_age.json', finalInput.account_age);

        // Run final.py
        const finalScriptPath = path.join(PYTHON_DIR, 'Final layer', 'final.py');
        await runPythonScript(finalScriptPath);

        // Read output
        const finalOutput = readJsonOutput('final_output.json');
        console.log('[Final Layer] Output:', finalOutput);

        return finalOutput;
    } catch (error) {
        console.error('[Final Layer] Error:', error);
        throw error;
    }
}

/**
 * Complete inference pipeline
 * Runs local, global, and final models in sequence
 * 
 * @param {object} params - Parameters
 * @returns {Promise<object>} - Final prediction with all layer outputs
 */
export async function runCompletePipeline(params) {
    const {
        dailyData,
        baseline,
        userProfile,
        accountAgeDays,
        previousLocalState
    } = params;

    try {
        console.log('[Pipeline] Starting complete inference pipeline...');

        // Run models in sequence
        const localOutput = await invokeLocalModel(dailyData, baseline, previousLocalState);
        const globalOutput = await invokeGlobalModel(dailyData, userProfile);
        const finalOutput = await invokeFinalModel(globalOutput, localOutput, accountAgeDays);

        // Combine all results
        const result = {
            timestamp: new Date().toISOString(),
            daily_data: dailyData,
            local_layer: localOutput,
            global_layer: globalOutput,
            final_output: finalOutput,
            pipeline_status: 'success'
        };

        console.log('[Pipeline] Complete. Final Score:', finalOutput.final_deviation_score);
        return result;
    } catch (error) {
        console.error('[Pipeline] Error:', error);

        // Return partial result with error
        return {
            timestamp: new Date().toISOString(),
            daily_data: dailyData,
            pipeline_status: 'error',
            error: error.message
        };
    }
}

/**
 * Get model status and configuration
 * @returns {object} - Model information
 */
export function getModelStatus() {
    return {
        python_dir: PYTHON_DIR,
        json_dir: JSON_DIR,
        models: {
            local: {
                script: path.join(PYTHON_DIR, 'Local Layer', 'local.py'),
                exists: fs.existsSync(path.join(PYTHON_DIR, 'Local Layer', 'local.py'))
            },
            global: {
                script: path.join(PYTHON_DIR, 'global_infer.py'),
                exists: fs.existsSync(path.join(PYTHON_DIR, 'global_infer.py')),
                model: path.join(PYTHON_DIR, 'global_layer_model.pkl'),
                model_exists: fs.existsSync(path.join(PYTHON_DIR, 'global_layer_model.pkl'))
            },
            final: {
                script: path.join(PYTHON_DIR, 'Final layer', 'final.py'),
                exists: fs.existsSync(path.join(PYTHON_DIR, 'Final layer', 'final.py'))
            }
        }
    };
}

export default {
    invokeLocalModel,
    invokeGlobalModel,
    invokeFinalModel,
    runCompletePipeline,
    getModelStatus
};
