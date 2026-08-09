// server/controllers/notificationController.js

const Notification = require("../models/Notification");

// Ottenere le notifiche dell'utente loggato (con paginazione ad alte prestazioni)
exports.getNotifications = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const query = { recipient: req.user.id };

    const [notifications, totalNotifications, unreadCount] = await Promise.all([
      Notification.find(query)
        .populate("sender", "username avatar_url _id")
        .populate({
          path: "targetReview",
          populate: {
            path: "movie",
            model: "Movie",
            select: "tmdb_id title poster_path media_type",
          },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ recipient: req.user.id, read: false }),
    ]);

    const totalPages = Math.ceil(totalNotifications / limit) || 1;
    const hasMore = page < totalPages;

    res.json({
      notifications,
      page,
      limit,
      totalPages,
      totalNotifications,
      unreadCount,
      hasMore,
    });
  } catch (error) {
    console.error("Errore nel recupero delle notifiche:", error);
    res.status(500).json({ message: "Errore del server." });
  }
};

// Endpoint ultra-veloce per polling del conteggio notifiche non lette
exports.getUnreadCount = async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({
      recipient: req.user.id,
      read: false,
    });
    res.json({ unreadCount });
  } catch (error) {
    console.error("Errore nel conteggio notifiche non lette:", error);
    res.status(500).json({ message: "Errore del server." });
  }
};

// Marcare tutte le notifiche come lette
exports.markAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, read: false },
      { $set: { read: true } }
    );

    res.json({ success: true, unreadCount: 0 });
  } catch (error) {
    console.error("Errore nel marcare notifiche come lette:", error);
    res.status(500).json({ message: "Errore del server." });
  }
};
