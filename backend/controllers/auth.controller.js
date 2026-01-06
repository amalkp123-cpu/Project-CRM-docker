const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { createUser, findUserByUsername } = require("../models/user.models");

exports.register = async (req, res) => {
  try {
    const { username, full_name, password, role } = req.body;

    const existingUser = await findUserByUsername(username);

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await createUser(username, full_name, hashedPassword, role);

    return res
      .status(201)
      .json({ message: "User registered successfully", user: newUser });
  } catch (err) {
    console.error("Error in registering user", err);
    return res.status(500).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await findUserByUsername(username);
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const payload = {
      id: user.id,
      username: user.username,
      role: user.role || "user",
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "5d",
    });

    res.json({ message: "login successful", token });
  } catch (err) {
    console.error("Error in logging in user", err);
    return res.status(500).json({ error: err.message });
  }
};
