import connection from "../database.js"
import jwt from "jsonwebtoken"

export async function login(req, res) {
    if (!req.body.username || !req.body.password) {
        res.json.status(400)({
            message: "username & password are required!"
        })
    }

    const [user] = await connection.query(
        `select * from users where username = "${req.body.username}"`
    )

    if (!user.length) {
        res.json.status(400)({
            message: "login failed"
        })
    }

    if (user[0].password != req.body.password) {
        res.json.status(400)({
            message: "login failed"
        })
    }

    const token = jwt.sign(user[0], "supersecret")

    res.json({
        message : "login success!!",
        token
    })
}