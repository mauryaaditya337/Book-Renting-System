const asyncHandler = require("../middleware/asyncHandler");
const validateRequest = require("../utils/validateRequest");
const { getBookMetadataByIsbn } = require("../services/bookMetadataService");

const getBookMetadataByIsbnController = asyncHandler(async (req, res) => {
  validateRequest(req);

  const metadata = await getBookMetadataByIsbn(req.params.isbn);

  res.status(200).json({
    metadata
  });
});

module.exports = {
  getBookMetadataByIsbnController
};
