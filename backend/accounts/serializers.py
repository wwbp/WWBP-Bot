from rest_framework.exceptions import ValidationError
from rest_framework import serializers
from .models import User, Module, Task


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name',
                  'email', 'role', 'grade', 'preferred_language']


class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = ['id', 'title', 'content']


class ModuleSerializer(serializers.ModelSerializer):
    tasks = TaskSerializer(many=True, required=False)
    assigned_students = serializers.PrimaryKeyRelatedField(
        many=True, queryset=User.objects.filter(role='student'))

    class Meta:
        model = Module
        fields = ['id', 'name', 'description', 'created_by',
                  'start_time', 'end_time', 'tasks', 'assigned_students']
        read_only_fields = ['created_by']

    def validate(self, data):
        if data['start_time'] >= data['end_time']:
            raise ValidationError("End time must be after start time")
        return data

    def create(self, validated_data):
        tasks_data = validated_data.pop('tasks', [])
        students_data = validated_data.pop('assigned_students', [])
        module = Module.objects.create(**validated_data)
        module.assigned_students.set(students_data)
        for task_data in tasks_data:
            Task.objects.create(module=module, **task_data)
        return module

    def update(self, instance, validated_data):
        tasks_data = validated_data.pop('tasks', [])
        students_data = validated_data.pop('assigned_students', [])
        instance.name = validated_data.get('name', instance.name)
        instance.description = validated_data.get(
            'description', instance.description)
        instance.start_time = validated_data.get(
            'start_time', instance.start_time)
        instance.end_time = validated_data.get('end_time', instance.end_time)
        instance.assigned_students.set(students_data)
        instance.save()

        keep_tasks = []
        for task_data in tasks_data:
            if "id" in task_data:
                task = Task.objects.get(id=task_data["id"], module=instance)
                task.title = task_data.get("title", task.title)
                task.content = task_data.get("content", task.content)
                task.save()
                keep_tasks.append(task.id)
            else:
                task = Task.objects.create(module=instance, **task_data)
                keep_tasks.append(task.id)

        instance.tasks.exclude(id__in=keep_tasks).delete()
        return instance
