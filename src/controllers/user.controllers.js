const catchError = require('../utils/catchError');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const sendEmail = require('../utils/sendEmail');
const EmailCode = require('../models/EmailCode');
const jwt = require('jsonwebtoken');

const getAll = catchError(async(req, res) => {
    const results = await User.findAll();
    return res.json(results);
});

const create = catchError(async(req, res) => {
    const { email, password, firstName, lastName, country, image, frontBaseUrl } = req.body
    const encryptedPassword = await bcrypt.hash(password, 10)
    const result = await User.create({
        email,
        password: encryptedPassword,
        firstName,
        lastName,
        country,
        image
    });
    const code = require('crypto').randomBytes(32).toString("hex")
    await EmailCode.create({
        code: code,
        userId: result.id
    })
    const link = `${frontBaseUrl}/auth/verify_email/${code}`
    //sendEmail
    await sendEmail({
		to: email, // Email del receptor
		subject: "verificate email for user app", // asunto
		html: `
            <h1>Hello ${firstName} ${lastName}</h1>
            <a href="${link}">${link}</a>
            <p><b>Thanks for sign up in user app</b></p>
        ` // texto
})
    return res.status(201).json(result);
});

const getOne = catchError(async(req, res) => {
    const { id } = req.params;
    const result = await User.findByPk(id);
    if(!result) return res.sendStatus(404);
    return res.json(result);
});

const remove = catchError(async(req, res) => {
    const { id } = req.params;
    await User.destroy({ where: {id} });
    return res.sendStatus(204);
});

const update = catchError(async(req, res) => {
    const { id } = req.params;
    const { firstName, lastName, country, image } = req.body
    const result = await User.update(
        { firstName, lastName, country, image },
        { where: {id}, returning: true }
    );
    if(result[0] === 0) return res.sendStatus(404);
    return res.json(result[1][0]);
});

// user/verifi/:code
const verifyCode = catchError(async(req, res) => {
    const { code } = req.params;
    const emailCode = await EmailCode.findOne({where: {code}});
    if(!emailCode) return res.status(401).json({message: "Code not fount"});
    const user = await User.findByPk(emailCode.userId);
    user.isVerified = true
    await user.save();
    await emailCode.destroy();
    return res.json(user);
});

const login = catchError(async(req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ where: {email} });
    if(!user) return res.status(401).json({ error: "invalid credentials" });
    if(!user.isVerified) return res.status(401).json({ error: "invalid credentials" });
    const isValid = await bcrypt.compare(password, user.password);
    if(!isValid) return res.status(401).json({ error: "invalid credentials" });

    const token = jwt.sign(
            {user},
            process.env.TOKEN_SECRET,
            { expiresIn: '1d' }
    )

    return res.json({user, token});
})

const getLoggedUser = catchError(async(req, res) => {
    return res.json(req.user)
});

//nueva ruta 
const resetPassword = catchError(async(req, res) => {
    const { email, frontBaseUrl } = req.body
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Usuario no encontrado' });
    const code = require('crypto').randomBytes(32).toString('hex');
    const resetLink = `${frontBaseUrl}/auth/reset_password/${code}`;
    await EmailCode.create({
        code,
        userId: user.id,
    });
    await sendEmail({
        to: user.email,
        subject: 'Restablecimiento de contraseña',
        html: `
          <h1>Restablecer Contraseña</h1>
          <p>Haga clic en el siguiente enlace para restablecer su contraseña:</p>
          <a href="${resetLink}">${resetLink}</a>
        `,
    });
    res.status(200).json({ message: 'Se ha enviado un correo electrónico con las instrucciones para restablecer la contraseña' });
});

const resetPasswordWithCode = catchError(async (req, res) => {
    const { password } = req.body;
    const { code } = req.params;
    const emailCode = await EmailCode.findOne({ where: { code } });
    if (!emailCode) return res.status(401).json({ error: 'Código no autorizado' });
    const encryptedPassword = await bcrypt.hash(password, 10);
    const user = await User.findByPk(emailCode.userId);
    if (!user) return res.status(401).json({ error: 'Usuario no encontrado' });
    user.password = encryptedPassword;
    await user.save();
    await emailCode.destroy();
    res.status(200).json({ message: 'Contraseña actualizada exitosamente' });
});

module.exports = {
    getAll,
    create,
    getOne,
    remove,
    update,
    verifyCode,
    login,
    getLoggedUser,
    resetPassword,
    resetPasswordWithCode
}