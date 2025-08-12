const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    const authHeader = req.header('Authorization');

    if (!authHeader) {
        return res.status(401).json({ message: 'Accesso negato. Nessun token fornito.' });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
         return res.status(401).json({ message: 'Accesso negato. Token malformato.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;
        next();
    } catch (ex) {
        res.status(400).json({ message: 'Token non valido.' });
    }
};

module.exports = authMiddleware;