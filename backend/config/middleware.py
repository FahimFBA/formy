# By: Md. Fahim Bin Amin

# This file contains a small CORS middleware for cross-origin frontend deployments
# (see DJANGO_CORS_ALLOWED_ORIGINS). Not needed when nginx serves the frontend and
# backend same-origin, as docker-compose.yml does.

from django.conf import settings


class SimpleCorsMiddleware:
    """
    Adds CORS headers for origins listed in settings.FORMY_CORS_ALLOWED_ORIGINS, and
    short-circuits preflight OPTIONS requests to a bare 204.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        """
        :param request: the current request
        :return: (HttpResponse) the downstream response, with CORS headers attached
        """
        if request.method == "OPTIONS":
            response = self.get_response(request)
            response.status_code = 204
        else:
            response = self.get_response(request)

        self.add_cors_headers(request, response)
        return response

    def add_cors_headers(self, request, response):
        """
        :param request: the current request, used for its Origin header
        :param response: the response to attach CORS headers to, mutated in place
        """
        origin = request.headers.get("Origin")

        if origin and origin in settings.FORMY_CORS_ALLOWED_ORIGINS:
            response["Access-Control-Allow-Origin"] = origin
            response["Access-Control-Allow-Credentials"] = "true"
            response["Access-Control-Allow-Headers"] = "Content-Type, X-CSRFToken"
            response["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
