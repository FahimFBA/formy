from rest_framework.throttling import SimpleRateThrottle


class SubmissionRateThrottle(SimpleRateThrottle):
    scope = "submission"

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)
        form_slug = view.kwargs.get("slug", "")
        return self.cache_format % {"scope": self.scope, "ident": f"{form_slug}:{ident}"}
