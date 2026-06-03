// รันครั้งเดียวเพื่อสร้างข้อมูลตั้งต้น
// วิธีใช้: node scripts/seed.mjs

import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, Timestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAKNOiTpqUxWr74r_WQ3V2mDdGVgjAflWI",
  authDomain: "leave-management-9c9fa.firebaseapp.com",
  projectId: "leave-management-9c9fa",
  storageBucket: "leave-management-9c9fa.firebasestorage.app",
  messagingSenderId: "1008053659129",
  appId: "1:1008053659129:web:646bdf2e7edd204ec2c928",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seed() {
  console.log("กำลังสร้างข้อมูลตั้งต้น...");

  // HR Admin ทดสอบ
  await setDoc(doc(db, "employees", "dev-hr-001"), {
    firstName: "ทดสอบ",
    lastName: "HR",
    nickname: "HR",
    branchNumber: 1,
    lineUserId: "dev-hr-001",
    lineProfilePic: "",
    isHR: true,
    isHRAdmin: true,
    isActive: true,
    resignationDate: null,
    resignationReason: null,
    nameHistory: [],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  console.log("✅ สร้าง HR Admin แล้ว (ID: dev-hr-001)");

  // พนักงานทดสอบ
  await setDoc(doc(db, "employees", "dev-emp-001"), {
    firstName: "พนักงาน",
    lastName: "ทดสอบ",
    nickname: "น้องทดสอบ",
    branchNumber: 1,
    lineUserId: "dev-emp-001",
    lineProfilePic: "",
    isHR: false,
    isHRAdmin: false,
    isActive: true,
    resignationDate: null,
    resignationReason: null,
    nameHistory: [],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  console.log("✅ สร้างพนักงานทดสอบแล้ว (ID: dev-emp-001)");

  console.log("\n🎉 เสร็จแล้ว! ไปทดสอบได้ที่ http://localhost:3001/dev-login");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
