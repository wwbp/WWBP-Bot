from django.apps import AppConfig


class LangchainStreamConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'langchain_stream'

    def ready(self):
        # Ensure signals or any other initialization code runs after app is ready
        from . import signals
