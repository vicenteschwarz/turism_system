function verificarRole(rolePermitida) {
  return (req, res, next) => {
    if (req.user.role !== rolePermitida) {
      return res.status(403).json({ error: "Acesso negado" });
    }
    next();
  };
}

module.exports = verificarRole;
