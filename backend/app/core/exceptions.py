class DomainError(Exception):
    message = "The operation could not be completed."

    def __init__(self, message: str | None = None) -> None:
        self.message = message or self.message
        super().__init__(self.message)


class ConflictError(DomainError):
    message = "The resource conflicts with existing data."


class NotFoundError(DomainError):
    message = "The requested resource was not found."


class ForbiddenError(DomainError):
    message = "You do not have permission to perform this action."


class InvalidTokenError(DomainError):
    message = "The authentication token is invalid or expired."
