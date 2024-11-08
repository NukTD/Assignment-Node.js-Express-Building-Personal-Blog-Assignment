import express from "express";
import cors from "cors";
import connectionPool from "./utils/db.mjs";

const app = express();
const port = process.env.PORT || 4001;

app.use(cors());
app.use(express.json());

app.get("/profiles", (reg, res) => {
  return res.status(200).json({
    data: {
      name: "john",
      age: 20,
    },
  });
});

app.post("/assignments", async (req, res) => {
  const newPost = {
    ...req.body,
    date: new Date(), // ใส่วันที่ปัจจุบันในฟิลด์ date
    likes_count: 0, // ค่าเริ่มต้นสำหรับ likes_count
  };
  if (
    !newPost.title ||
    !newPost.image ||
    !newPost.category_id ||
    !newPost.description ||
    !newPost.content ||
    !newPost.status_id
  ) {
    return res.status(400).json({
      message:
        "Server could not create post because there are missing data from client",
    });
  }
  try {
    await connectionPool.query(
      `INSERT INTO posts (title, image, category_id, description, content, status_id, date, likes_count)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        newPost.title,
        newPost.image,
        newPost.category_id,
        newPost.description,
        newPost.content,
        newPost.status_id,
        newPost.date,
        newPost.likes_count,
      ]
    );
    return res.status(201).json({
      message: "Create post successfully",
    });
  } catch {
    return res.status(500).json({
      message: "Server could not create post because database connection",
    });
  }
});

app.listen(port, () => {
  console.log(`Server is running at ${port}`);
});
