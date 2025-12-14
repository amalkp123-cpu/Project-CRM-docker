require("dotenv").config(); // ensure env loaded
const { decrypt } = require("../utils/crypto-utils"); // adjust path

const blob = "ZiNnddEq8Kg1JhAzTrh2kPucAGoiTl0x2DJr49xkt8EIoVDLIw==";
console.log("blob len", blob.length);
console.log("looks like base64?", /^[A-Za-z0-9+/=]+$/.test(blob));
console.log("decrypt ->", decrypt(blob));
