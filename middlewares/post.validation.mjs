const validateCreatePostData = (req, res, next) => {
  if (!req.body.title || typeof req.body.title !== "string") {
    return res.status(400).json({
      message: !req.body.title
        ? "Title is required"
        : "Title must be a text value",
    });
  }

  if (!req.body.image || typeof req.body.image !== "string") {
    return res.status(400).json({
      message: !req.body.image ? "Image is required" : "Image must be a URL",
    });
  }

  if (!req.body.category_id || typeof req.body.category_id !== "number") {
    return res.status(400).json({
      message: !req.body.category_id
        ? "ID Category is required"
        : "Category ID must be a number",
    });
  }

  if (!req.body.description || typeof req.body.description !== "string") {
    return res.status(400).json({
      message: !req.body.description
        ? "Description is required"
        : "Description must be a text value",
    });
  }

  if (!req.body.content || typeof req.body.content !== "string") {
    return res.status(400).json({
      message: !req.body.content
        ? "Content is required"
        : "Content must be a text value",
    });
  }

  if (!req.body.status_id || typeof req.body.status_id !== "string") {
    return res.status(400).json({
      message: !req.body.status_id
        ? "Status ID is required"
        : "Status ID must be a text value",
    });
  }
  next();
};

export default validateCreatePostData;
