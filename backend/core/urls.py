from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve as serve_static_file
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.throttling import ScopedRateThrottle
from academy.serializers import CustomTokenObtainPairSerializer

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('academy.urls')),
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
elif getattr(settings, 'SERVE_MEDIA', False):
    # django.conf.urls.static.static() intentionally returns no routes when
    # DEBUG=False. This deployment explicitly opts into serving uploaded media
    # from Django until a dedicated object store/web server is configured.
    urlpatterns += [
        re_path(r'^media/(?P<path>.*)$', serve_static_file, {'document_root': settings.MEDIA_ROOT}),
    ]
