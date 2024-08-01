from rest_framework import serializers
from .models import User, Module, Task, ChatSession, ChatMessage, SystemPrompt


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name',
                  'email', 'role', 'grade', 'preferred_language']


class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = ['id', 'title', 'content', 'instruction_prompt',
                  'persona_prompt', 'module', 'files']


class ModuleSerializer(serializers.ModelSerializer):
    tasks = TaskSerializer(many=True, required=False)

    class Meta:
        model = Module
        fields = ['id', 'name', 'created_by', 'content',
                  'files', 'tasks']
        read_only_fields = ['created_by']

    def create(self, validated_data):
        tasks_data = validated_data.pop('tasks', [])
        module = Module.objects.create(**validated_data)
        for task_data in tasks_data:
            Task.objects.create(module=module, **task_data)
        return module

    def update(self, instance, validated_data):
        tasks_data = validated_data.pop('tasks', [])
        instance.name = validated_data.get('name', instance.name)
        instance.content = validated_data.get('content', instance.content)
        instance.files = validated_data.get('files', instance.files)
        instance.save()

        # Update tasks if provided
        keep_tasks = []
        for task_data in tasks_data:
            if "id" in task_data:
                task = Task.objects.get(id=task_data["id"], module=instance)
                task.title = task_data.get("title", task.title)
                task.content = task_data.get("content", task.content)
                task.instruction_prompt = task_data.get(
                    "instruction_prompt", task.instruction_prompt)
                task.persona_prompt = task_data.get(
                    "persona_prompt", task.persona_prompt)
                task.files = task_data.get("files", task.files)
                task.save()
                keep_tasks.append(task.id)
            else:
                task = Task.objects.create(module=instance, **task_data)
                keep_tasks.append(task.id)

        # Remove tasks not in the request
        if keep_tasks:
            instance.tasks.exclude(id__in=keep_tasks).delete()
        return instance


class ChatSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatSession
        fields = ['id', 'user', 'module', 'task', 'assistant_id',
                  'thread_id', 'prompt_tokens', 'completion_tokens', 'total_tokens',
                  'created_at', 'updated_at']


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ['id', 'session', 'message', 'sender', 'created_at']


class SystemPromptSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemPrompt
        fields = ['id', 'prompt', 'created_at', 'updated_at']
