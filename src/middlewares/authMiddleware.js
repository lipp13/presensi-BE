import jwt from "jsonwebtoken"

export function authMiddleware(req, res, next) { 
    const headerToken = req.headers['authorization']

    if (!headerToken) {
        res.status(400).json({
            message: "Ga Punya Akses"
        })
    }
    const token = headerToken.split(" ") [1]
    
    jwt.verify(token, "supersecret", (err, user) => {
      if (err) {
        res.status(400).json({
          message: "Forbidden",
        });
      }

      req.user = user

      next();
    });
    
}