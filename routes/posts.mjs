import { Router } from "express";
import connectionPool from "../utils/db.mjs";
import validateCreatePostData from "../middlewares/post.validation.mjs";

const postsRouter = Router();

postsRouter.post("/", [validateCreatePostData], async (req, res) => {
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
  } catch (error) {
    return res.status(500).json({
      message: "Server could not create post because database connection",
      error: error.message,
    });
  }
});

postsRouter.get("/:postId", async (req, res) => {
  const postIdFromClient = req.params.postId;
  try {
    const results = await connectionPool.query(
      `select * from posts where id=$1`,
      [postIdFromClient]
    );

    if (results.rows.length === 0) {
      return res.status(404).json({
        message: `Server could not find a requested post from ${postIdFromClient}`,
      });
    }

    return res.status(200).json({
      data: results.rows[0],
    });
  } catch {
    return res.status(500).json({
      message: "Server could not create post because database connection",
    });
  }
});

postsRouter.put("/:postId", [validateCreatePostData], async (req, res) => {
  try {
    const postIdFromClient = req.params.postId;
    const updatePost = { ...req.body };
    const results = await connectionPool.query(
      `UPDATE posts
       SET title = $1,
           image = $2,
           category_id = $3,
           description = $4,
           content = $5,
           status_id = $6
       WHERE id = $7`,
      [
        updatePost.title,
        updatePost.image,
        updatePost.category_id,
        updatePost.description,
        updatePost.content,
        updatePost.status_id,
        postIdFromClient,
      ]
    );

    if (results.rowCount === 0) {
      return res.status(404).json({
        message: `Server could not find a requested post to update`,
        error: error.message,
      });
    }

    return res.status(200).json({
      message: "Updated post sucessfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: `Server error: ${error.message}`,
      error: error.message,
    });
  }
});

postsRouter.delete("/:postId", async (reg, res) => {
  const postIdFromClient = reg.params.postId;
  await connectionPool.query(
    `delete from posts
    where id = $1`,
    [postIdFromClient]
  );

  return res.status(200).json({
    message: "Delete post successfully",
  });
});

postsRouter.get("/", async (req, res) => {
  // ลอจิกในอ่านข้อมูลโพสต์ทั้งหมดในระบบ
  try {
    // 1) Access ข้อมูลใน Body จาก Request ด้วย req.body
    const category = req.query.category || "";
    const keyword = req.query.keyword || "";
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 6;
    // 2) ทำให้แน่ใจว่า query parameter page และ limit จะมีค่าอย่างต่ำเป็น 1
    const safePage = Math.max(1, page);
    const safeLimit = Math.max(1, Math.min(100, limit));
    const offset = (safePage - 1) * safeLimit;
    // offset คือค่าที่ใช้ในการข้ามจำนวนข้อมูลบางส่วนตอน query ข้อมูลจาก database
    // ถ้า page = 2 และ limit = 6 จะได้ offset = (2 - 1) * 6 = 6 หมายความว่าต้องข้ามแถวไป 6 แถวแรก และดึงแถวที่ 7-12 แทน
    // 3) เขียน Query เพื่อ Insert ข้อมูลโพสต์ ด้วย Connection Pool
    let query = `
      SELECT posts.id, posts.image, categories.name AS category, posts.title, posts.description, posts.date, posts.content, statuses.status, posts.likes_count
      FROM posts
      INNER JOIN categories ON posts.category_id = categories.id
      INNER JOIN statuses ON posts.status_id = statuses.id
    `;
    let values = [];
    // 4) เขียน query จากเงื่อนไขของการใส่ query parameter category และ keyword
    if (category && keyword) {
      query += `
        WHERE categories.name ILIKE $1 
        AND (posts.title ILIKE $2 OR posts.description ILIKE $2 OR posts.content ILIKE $2)
      `;
      values = [`%${category}%`, `%${keyword}%`];
    } else if (category) {
      query += " WHERE categories.name ILIKE $1";
      values = [`%${category}%`];
    } else if (keyword) {
      query += `
        WHERE posts.title ILIKE $1 
        OR posts.description ILIKE $1 
        OR posts.content ILIKE $1
      `;
      values = [`%${keyword}%`];
    }
    // 5) เพิ่มการ odering ตามวันที่, limit และ offset
    query += ` ORDER BY posts.date DESC LIMIT $${values.length + 1} OFFSET $${
      values.length + 2
    }`;
    values.push(safeLimit, offset);
    // 6) Execute the main query (ดึงข้อมูลของบทความ)
    const result = await connectionPool.query(query, values);
    // 7) สร้าง Query สำหรับนับจำนวนทั้งหมดตามเงื่อนไข พื่อใช้สำหรับ pagination metadata
    let countQuery = `
      SELECT COUNT(*)
      FROM posts
      INNER JOIN categories ON posts.category_id = categories.id
      INNER JOIN statuses ON posts.status_id = statuses.id
    `;
    let countValues = values.slice(0, -2); // ลบค่า limit และ offset ออกจาก values
    if (category && keyword) {
      countQuery += `
        WHERE categories.name ILIKE $1 
        AND (posts.title ILIKE $2 OR posts.description ILIKE $2 OR posts.content ILIKE $2)
      `;
    } else if (category) {
      countQuery += " WHERE categories.name ILIKE $1";
    } else if (keyword) {
      countQuery += `
        WHERE posts.title ILIKE $1 
        OR posts.description ILIKE $1 
        OR posts.content ILIKE $1
      `;
    }
    const countResult = await connectionPool.query(countQuery, countValues);
    const totalPosts = parseInt(countResult.rows[0].count, 10);
    // 8) สร้าง response พร้อมข้อมูลการแบ่งหน้า (pagination)
    const results = {
      totalPosts,
      totalPages: Math.ceil(totalPosts / safeLimit),
      currentPage: safePage,
      limit: safeLimit,
      posts: result.rows,
    };
    // เช็คว่ามีหน้าถัดไปหรือไม่
    if (offset + safeLimit < totalPosts) {
      results.nextPage = safePage + 1;
    }
    // เช็คว่ามีหน้าก่อนหน้าหรือไม่
    if (offset > 0) {
      results.previousPage = safePage - 1;
    }
    // 9) Return ตัว Response กลับไปหา Client ว่าสร้างสำเร็จ
    return res.status(200).json(results);
  } catch {
    return res.status(500).json({
      message: "Server could not read post because database issue",
    });
  }
});

export default postsRouter;
