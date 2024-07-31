from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import GeneratePresignedURL, CSVCreateView, CSVListView, CSVServeView, LocalFileUploadView, UserViewSet, ModuleViewSet, TaskViewSet, ChatSessionViewSet, ChatMessageViewSet, SystemPromptViewSet, csrf, current_time, login_view, logout_view, user_profile, register, switch_to_student_view, switch_to_teacher_view, get_view_mode

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'modules', ModuleViewSet)
router.register(r'tasks', TaskViewSet)
router.register(r'chat_sessions', ChatSessionViewSet)
router.register(r'chat_messages', ChatMessageViewSet)
router.register(r'system_prompts', SystemPromptViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('csrf/', csrf, name='csrf'),
    path('time/', current_time, name='current-time'),
    path('login/', login_view, name='login'),
    path('logout/', logout_view, name='logout'),
    path('profile/', user_profile, name='profile'),
    path('register/', register, name='register'),
    path('switch_to_student_view/', switch_to_student_view,
         name='switch_to_student_view'),
    path('switch_to_teacher_view/', switch_to_teacher_view,
         name='switch_to_teacher_view'),
    path('get_view_mode/', get_view_mode, name='get_view_mode'),
    path('generate_presigned_url/', GeneratePresignedURL.as_view(),
         name='generate_presigned_url'),
    path('csv_transcripts/', CSVCreateView.as_view(), name='csv_create'),
    path('csv_transcripts/download/<int:csv_id>/',
         CSVServeView.as_view(), name='csv_serve'),
    path('csv_transcripts/list/', CSVListView.as_view(), name='csv_list'),
    path('csv_transcripts/list/<int:csv_id>/',
         CSVListView.as_view(), name='csv_delete'),
    path('local_upload/', LocalFileUploadView.as_view(), name='local-upload'),
]
