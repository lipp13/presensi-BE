import connection from '../database.js';

export async function getUsers(req, res) {
    const [users] = await connection.query(
        `SELECT id, username FROM users`
    );
    res.json({
        message : "success",
        data    : users,
        ok      : true
    }); 
}