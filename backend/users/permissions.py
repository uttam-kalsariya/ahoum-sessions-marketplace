from rest_framework import permissions
from .models import UserRole


class IsCreator(permissions.BasePermission):
    """
    Permission check ensuring user is authenticated and has the CREATOR role.
    """
    message = "Creator privileges required for this action."

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == UserRole.CREATOR
        )


class IsCreatorOrReadOnly(permissions.BasePermission):
    """
    Safe methods allowed for anyone; modification requires CREATOR role.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == UserRole.CREATOR
        )


class IsSessionOwner(permissions.BasePermission):
    """
    Object-level permission allowing only the creator of the session to edit or delete it.
    """
    message = "You do not have permission to modify another creator's session."

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        # For Session object: obj.creator
        creator = getattr(obj, 'creator', None)
        return creator == request.user


# Alias for compatibility
IsOwner = IsSessionOwner

