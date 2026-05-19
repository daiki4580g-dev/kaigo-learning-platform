

import * as fs from "fs";
import * as path from "path";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

type CsvUser = {
  username: string;
  password: string;
  facilityId: string;
  facilityName: string;
  role: string;
};

const csvPath = path.join(process.cwd(), "data", "users.csv");
const serviceAccountPath = path.join(process.cwd(), "serviceAccountKey.json");

const normalizeEmailFromUsername = (username: string) => {
  return `${username}@kaigo-learning.local`;
};

const parseCsv = (csvText: string): CsvUser[] => {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const [, ...rows] = lines;

  return rows.map((row, index) => {
    const [username, password, facilityId, facilityName, role] = row
      .split(",")
      .map((value) => value.trim());

    if (!username || !password || !facilityId || !facilityName || !role) {
      throw new Error(
        `${index + 2}行目に不足があります。username,password,facilityId,facilityName,role を確認してください。`
      );
    }

    return {
      username,
      password,
      facilityId,
      facilityName,
      role,
    };
  });
};

const main = async () => {
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSVファイルが見つかりません: ${csvPath}`);
  }

  if (!fs.existsSync(serviceAccountPath)) {
    throw new Error(
      `Firebaseのサービスアカウントキーが見つかりません: ${serviceAccountPath}`
    );
  }

  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));

  if (getApps().length === 0) {
    initializeApp({
      credential: cert(serviceAccount),
    });
  }

  const auth = getAuth();
  const db = getFirestore();
  const csvText = fs.readFileSync(csvPath, "utf-8");
  const users = parseCsv(csvText);

  console.log(`登録対象: ${users.length}名`);

  for (const user of users) {
    const email = normalizeEmailFromUsername(user.username);

    try {
      let uid = "";

      try {
        const existingUser = await auth.getUserByEmail(email);
        uid = existingUser.uid;
        console.log(`既存ユーザー: ${user.username}`);
      } catch {
        const createdUser = await auth.createUser({
          email,
          password: user.password,
          displayName: user.username,
        });
        uid = createdUser.uid;
        console.log(`Auth作成: ${user.username}`);
      }

      await db.collection("users").doc(uid).set(
        {
          uid,
          username: user.username,
          email,
          role: user.role,
          facilityId: user.facilityId,
          facilityName: user.facilityName,
          status: "未開始",
          progress: 0,
          lectureCount: 0,
          completedLectureCount: 0,
          totalWatchSeconds: 0,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      await db.collection("facilities").doc(user.facilityId).set(
        {
          facilityId: user.facilityId,
          facilityName: user.facilityName,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      console.log(`Firestore登録: ${user.username}`);
    } catch (error) {
      console.error(`登録失敗: ${user.username}`);
      console.error(error);
    }
  }

  console.log("一括登録が完了しました。お疲れさまでした。");
};

main().catch((error) => {
  console.error("一括登録処理でエラーが発生しました。", error);
  process.exit(1);
});