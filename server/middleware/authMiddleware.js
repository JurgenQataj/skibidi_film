const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Estrae il token dall'header
            token = req.headers.authorization.split(' ')[1];

            // Verifica il token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // CORREZIONE FONDAMENTALE:
            // Il token è stato creato come { user: { id: ... } }
            // Quindi dobbiamo estrarre .user per avere l'oggetto giusto
            req.user = decoded.user; 

            next();
        } catch (error) {
            if (error.name !== 'TokenExpiredError') {
                console.error("Errore verifica token:", error.message);
            }
            res.status(401).json({ message: 'Non autorizzato, token non valido' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Non autorizzato, nessun token fornito' });
    }
};

const optionalProtect = (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded.user;
        } catch (error) {
            // Ignora errore per rotte con auth opzionale
        }
    }
    next();
};

module.exports = { protect, optionalProtect };