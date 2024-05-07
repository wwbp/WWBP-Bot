from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
import json


class TestUserModel(TestCase):
    def test_create_user(self):
        User = get_user_model()
        user = User.objects.create_user(
            email='test@example.com', username='testuser', password='password123')
        self.assertEqual(user.email, 'test@example.com')
        self.assertEqual(user.username, 'testuser')
        self.assertFalse(user.is_superuser)
        self.assertTrue(user.is_active)
        self.assertEqual(user.role, 'student')

    def test_create_superuser(self):
        User = get_user_model()
        admin_user = User.objects.create_superuser(
            'adminuser', 'admin@example.com', 'admin123')
        self.assertTrue(admin_user.is_superuser)
        self.assertTrue(admin_user.is_staff)
        self.assertEqual(admin_user.email, 'admin@example.com')


class TestUserAPI(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username='testuser',
                                                         email='test@example.com', password='password123', role='student')
        # Adjust the base URL based on your actual API endpoint
        self.api_base_url = '/api/users/'

    def test_register_user(self):
        url = reverse('auth-register')
        data = {
            "username": "newuser",
            "email": "newuser@example.com",
            "password": "newpassword123",
            "role": "student"
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_login_user(self):
        url = reverse('auth-login')
        data = {
            "email": "test@example.com",
            "password": "password123"
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('User logged in', response.data['success'])

    def test_logout_user(self):
        url = reverse('auth-logout')
        self.client.login(email='test@example.com', password='password123')
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('User logged out', response.data['success'])

    def test_user_detail_and_update(self):
        user_id = self.user.id
        url = reverse('user-detail-update', kwargs={'user_id': user_id})
        get_response = self.client.get(url)
        self.assertEqual(get_response.status_code, status.HTTP_200_OK)

        # Convert dict to JSON string
        put_data = json.dumps({"email": "updated@example.com"})
        put_response = self.client.put(
            url, put_data, content_type='application/json')
        if put_response.status_code != status.HTTP_200_OK:
            # Print error details if status code is not 200
            print(put_response.data)
        self.assertEqual(put_response.status_code, status.HTTP_200_OK)
        self.assertEqual(put_response.data['email'], 'updated@example.com')
