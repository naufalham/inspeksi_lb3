function errorHandler(err, req, res, next) {
  console.error(err.stack);

  if (err.name === 'PrismaClientKnownRequestError') {
    if (err.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'Data sudah ada (duplikat)' });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
    }
  }

  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({ success: false, message });
}

module.exports = errorHandler;
