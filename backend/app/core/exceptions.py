class DataNotFoundError(Exception):
    """Raised when required domain data is unavailable."""


class AuthenticationError(Exception):
    """Raised when request authentication fails."""


class ForecastError(Exception):
    """Raised when forecast generation or validation fails."""


class RecommendationError(ForecastError):
    """Raised when recommendation generation fails."""
