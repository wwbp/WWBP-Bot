from rest_framework.exceptions import ValidationError
from rest_framework import serializers
from .models import User, Module, Task


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name',
                  'email', 'role', 'grade', 'preferred_language']


class ModuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Module
        fields = ['id', 'name', 'description',
                  'created_by', 'start_time', 'end_time']
        read_only_fields = ['created_by']

    def validate(self, data):
        if data['start_time'] >= data['end_time']:
            raise ValidationError("End time must be after start time")
        return data

    def create(self, validated_data):
        request = self.context.get('request')
        validated_data['created_by'] = request.user
        return super().create(validated_data)


class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = ['id', 'title', 'content', 'module', 'assigned_to']
