const EmailCode = require("./EmailCode");
const User = require("./User");

//Relaciones

EmailCode.belongsTo(User)
User.hasOne(EmailCode)