export function roleMiddleware(role) {
  return function(req, res, next) {
    if (!req.user) {
        res.status(401).json({
            message: "Token tidak ada"
        })
    }

    if (req.user.role != role) {
        res.status(403).json({
            message: "Tidak memiliki izin"
        })
    }

    next()
  }
}