const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const express = require("express");
const morgan = require("morgan");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const router = express.Router();
const isLoggedIn = require("../auth");

router.use(express.json());
router.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).send(err.message || "Internal server error.");
  next(err);
});

//GET ALL ITEMS
router.get("/items", async (req, res, next) => {
  try {
    const items = await prisma.items.findMany();
    res.send(items);
  } catch (error) {
    next(error);
  }
});

//get 1 item
router.get("/items/:id", async (req, res, next) => {
  try {
    const item = await prisma.items.findUnique({
      where: {
        id: parseInt(req.params.id),
      },
    });
    if (item) {
      res.send(item);
    } else {
      res.sendStatus(404);
    }
  } catch (error) {
    next(error);
  }
});
//GET ALL REVIEW
router.get("/reviews", async (req, res, next) => {
  try {
    const reviews = await prisma.reviews.findMany();
    res.send(reviews);
  } catch (error) {
    next(error);
  }
});

//GET REVIEW ON ONE ITEM
router.get("/reviews/:id", async (req, res, next) => {
  try {
    const item = await prisma.items.findUnique({
      where: {
        id: parseInt(req.params.id),
      },
    });
    if (item) {
      res.send(item);
    } else {
      res.sendStatus(404);
    }
  } catch (error) {
    next(error);
  }
});

//GET COMMENTS ON REVIEW
router.get("/comments/:reviewsId", async (req, res, next) => {
  try {
    const comments = await prisma.comments.findMany({
      where: {
        reviewsId: parseInt(req.params.reviewsId),
      },
    });
    res.json(comments);
  } catch (error) {
    next(error);
  }
});

//REGISTER USER //NEEDS WORK
router.post("/register", async (req, res, next) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const user = await prisma.users.create({
      data: {
        username: req.body.username,
        password: hashedPassword,
      },
    });

    // Create a token with the user id
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);

    res.status(201).send({ token });
  } catch (error) {
    next(error);
  }
});
//LOGIN EXISTING USER
router.get("/login", async (req, res, next) => {
  try {
    const user = await prisma.users.findUnique({
      where: {
        username: req.body.username,
        password: req.body.password,
      },
    });

    if (!user || user.password !== req.body.password) {
      return res.status(401).send("Invalid login credentials.");
    }

    // Create a token with the instructor id
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);

    res.send({ token });
  } catch (error) {
    next(error);
  }
});

//user creates review
router.post("/reviews", isLoggedIn, async (req, res, next) => {
  try {
    // Validate request body
    if (!req.body.review) {
      return res.status(400).json({ error: "Review text is required" });
    }

    // Create new review
    await prisma.reviews.create({
      data: {
        review: req.body.review,
        rating: req.body.rating,
        itemId: req.body.itemId,
        userId: req.body.userId,
      },
    });

    res.status(200).send("Review successfully created.");
  } catch (error) {
    next(error);
  }
});

//user creates comment on item
router.post("/comments/:reviewsId", isLoggedIn, async (req, res, next) => {
  try {
    // Create new review
    await prisma.comments.create({
      data: {
        comment: req.body.comment,
        rating: req.body.rating,
        itemId: req.body.itemId,
        username: req.body.username,
        reviewsId: req.body.reviewsId,
      },
    });

    res.status(200).send("Comment successfully created.");
  } catch (error) {
    next(error);
  }
});
//get all reviews user has made
router.get("/me/reviews", isLoggedIn, async (req, res) => {
  try {
    const userId = req.user.id;
    const userReviews = await prisma.reviews.findMany({
      where: {
        userId: userId,
      },
    });
    res.json(userReviews);
  } catch (error) {
    console.error(error);
  }
});

//get comments user has made
router.get("/me/comments", isLoggedIn, async (req, res, next) => {
  try {
    const userComments = await prisma.comments.findMany({
      where: {
        username: req.body.username,
      },
    });
    if (userComments.length === 0) {
      return res.status(200).send("You haven't written any comments yet.");
    }
    res.send(userComments);
  } catch (error) {
    next(error);
  }
});

//delete review user has made
router.delete("/me/review/:id", isLoggedIn, async (req, res, next) => {
  try {
    const reviewId = parseInt(req.params.id);

    // Find the review
    const review = await prisma.reviews.findUnique({
      where: {
        id: reviewId,
      },
    });

    if (!review || review.userId !== req.user.userId) {
      return res.status(401).send("Not authorized to delete this review");
    }

    await prisma.reviews.delete({
      where: {
        id: reviewId,
      },
    });

    res.status(200).send("Review deleted");
  } catch (error) {
    console.error(error);

    res.status(500).send("Internal Server Error");
  }
});

router.delete("/me/comment/:id", isLoggedIn, async (req, res, next) => {
  try {
    const commentId = parseInt(req.params.id);

    const comment = await prisma.comments.findUnique({
      where: {
        id: commentId,
      },
    });

    if (!comment || comment.username !== req.user.username) {
      return res.status(401).send("Not authorized to delete this comment");
    }

    await prisma.comments.delete({
      where: {
        id: commentId,
      },
    });

    res.status(200).send("Comment deleted");
  } catch (error) {
    console.error(error);

    res.status(500).send("Internal Server Error");
  }
});

//edit review user has made
router.put("/reviews/:id", isLoggedIn, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const reviewId = parseInt(req.params.id);

    const review = await prisma.reviews.findUnique({
      where: {
        id: reviewId,
      },
      select: {
        userId: true,
      },
    });

    if (!review || review.userId !== userId) {
      return res.status(401).json({ error: "Not authorized to edit review." });
    }

    await prisma.reviews.update({
      where: {
        id: reviewId,
      }, //just include what is being updated
      data: {
        review: req.body.review,
        rating: req.body.rating,
        // itemId: req.body.itemId,
        // userId: userId,
      },
    });
  } catch (error) {
    console.error(error);
  }
});

//get user Info
router.get("/me", isLoggedIn, async (req, res, next) => {
  try {
    const user = await prisma.users.findUnique({
      where: {
        id: req.user?.id,
        username: req.body.username,
      },
    });
    console.log("user:", user);
    res.send(user);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
