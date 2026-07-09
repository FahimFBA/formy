# By: Md. Fahim Bin Amin

# This file contains DRF permission classes used by formy's views.

from rest_framework.permissions import BasePermission


class IsOwner(BasePermission):
    """
    Restricts object-level access to the user who owns the object.
    """

    def has_object_permission(self, request, view, obj):
        """
        :param request: the current request, used for its authenticated user
        :param view: the view this permission is attached to
        :param obj: the model instance being accessed; must have an owner_id attribute
        :return: (bool) True if the requesting user owns obj
        """
        return obj.owner_id == request.user.id
