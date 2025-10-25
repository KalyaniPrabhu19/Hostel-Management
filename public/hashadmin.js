import { hash } from "bcrypt";

const generateHash = async () => {
  const hashedPassword = await hash("09876", 10); // change this to your admin's actual password
  console.log("✅ Hashed password:", hashedPassword);
};

generateHash();
