from django.conf import settings


class SimpleCorsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method == "OPTIONS":
            response = self.get_response(request)
            response.status_code = 204
        else:
            response = self.get_response(request)

        self.add_cors_headers(request, response)
        return response

    def add_cors_headers(self, request, response):
        origin = request.headers.get("Origin")

        if origin and origin in settings.FORMY_CORS_ALLOWED_ORIGINS:
            response["Access-Control-Allow-Origin"] = origin
            response["Access-Control-Allow-Credentials"] = "true"
            response["Access-Control-Allow-Headers"] = "Content-Type, X-CSRFToken"
            response["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
