const { getAll, create, getOne, remove, update, verifyCode, login, getLoggedUser, resetPassword, resetPasswordWithCode } = require('../controllers/user.controllers');
const express = require('express');
const verifyJWT = require('../utils/verifyJWT');

const userRouter = express.Router();

userRouter.route('/')
    .get(verifyJWT, getAll) // no proteger
    .post(create);

userRouter.route('/verify/:code')
    .get(verifyCode);

userRouter.route('/login')
    .post(login);

userRouter.route('/me')
    .get(verifyJWT, getLoggedUser)

// Nuevas rutas para resetear la contraseña
userRouter.route('/reset_password')
.post(resetPassword);

userRouter.route('/reset_password/:code')
.post(resetPasswordWithCode);

userRouter.route('/:id')
    .get(verifyJWT, getOne)
    .delete(verifyJWT, remove)
    .put(verifyJWT, update);

module.exports = userRouter;