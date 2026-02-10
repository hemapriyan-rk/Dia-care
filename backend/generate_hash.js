import bcrypt from 'bcrypt';

bcrypt.hash("jass123", 10, function(err, hash) {
  if (err) {
    console.error("Error:", err);
    process.exit(1);
  }
  console.log(hash);
});
