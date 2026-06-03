# วิธีตั้งค่าโปรเจกต์

## 1. ติดตั้ง dependencies
```
npm install
```

## 2. สร้างไฟล์ .env.local
คัดลอกจาก .env.example แล้วกรอกค่า:
```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_LIFF_ID=...
```

## 3. ตั้งค่า Firebase
1. สร้าง Firebase Project ที่ https://console.firebase.google.com
2. เปิดใช้ Firestore Database
3. คัดลอก config ไปใส่ใน .env.local

## 4. ตั้งค่า LINE LIFF
1. ไปที่ https://developers.line.biz
2. เข้า LINE Official Account ของบริษัท
3. สร้าง LIFF App
4. ใส่ LIFF ID ใน .env.local
5. ตั้ง Endpoint URL เป็น URL ของ Vercel

## 5. Deploy บน Vercel
1. Push code ขึ้น GitHub
2. เชื่อม Vercel กับ GitHub repo
3. ใส่ Environment Variables เดียวกับ .env.local ใน Vercel Settings
4. Deploy

## 6. เพิ่ม HR คนแรก
หลัง deploy แล้ว ต้องเพิ่มพนักงานคนแรก (HR Admin) ใน Firestore Console โดยตรง:
- Collection: employees
- Field isHR: true
- Field isHRAdmin: true
- ใส่ firstName, lastName, nickname, branchNumber

## โครงสร้างหน้า
- `/` — หน้าแรก (redirect อัตโนมัติ)
- `/link` — ผูกบัญชี LINE ครั้งแรก
- `/employee/dashboard` — หน้าหลักพนักงาน
- `/employee/leave` — แจ้งลา
- `/employee/history` — ประวัติลา
- `/employee/profile` — โปรไฟล์
- `/hr/dashboard` — หน้าหลัก HR
- `/hr/employees` — จัดการพนักงาน
- `/hr/leave-approvals` — อนุมัติลาป่วย
- `/hr/leave-settings` — ตั้งค่าวันลา
- `/hr/public-holidays` — วันนักขัตฤกษ์
- `/hr/pay-periods` — รอบตัดจ่าย
- `/hr/reports` — รายงาน
- `/hr/audit-log` — ประวัติการแก้ไข
