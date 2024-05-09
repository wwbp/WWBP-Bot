from django.http import JsonResponse
from datetime import datetime


def current_time(request):
    now = datetime.now().isoformat()
    return JsonResponse({'current_time': now})
