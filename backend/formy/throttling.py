# By: Md. Fahim Bin Amin

# This file contains DRF throttle classes used by formy's public endpoints.

from rest_framework.throttling import SimpleRateThrottle


class SubmissionRateThrottle(SimpleRateThrottle):
    """
    Rate limits public form submissions per form and per client, so one abusive client
    cannot exhaust the limit for every other visitor of the same form. Rate is set by
    DEFAULT_THROTTLE_RATES["submission"] (FORMY_SUBMISSION_THROTTLE_RATE), and requires
    a shared cache (Redis) across processes to count correctly; see settings.py.
    """

    scope = "submission"

    def get_cache_key(self, request, view):
        """
        :param request: the current request
        :param view: the view this throttle is attached to; must expose a "slug" kwarg
        :return: (str) cache key unique per form slug and client identity
        """
        ident = self.get_ident(request)
        form_slug = view.kwargs.get("slug", "")
        return self.cache_format % {"scope": self.scope, "ident": f"{form_slug}:{ident}"}
