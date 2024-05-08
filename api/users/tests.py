from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
import json


class TestUserModel(TestCase):
    """Tests for the User model."""

    def test_create_user(self):
        User = get_user_model()
        user = User.objects.create_user(
            email='test@example.com', username='testuser', password='password123')
        self.assertEqual(user.email, 'test@example.com')
        self.assertEqual(user.username, 'testuser')
        self.assertFalse(user.is_superuser)
        self.assertTrue(user.is_active)

    def test_create_superuser(self):
        User = get_user_model()
        admin_user = User.objects.create_superuser(
            username='adminuser', email='admin@example.com', password='admin123')
        self.assertTrue(admin_user.is_superuser)
        self.assertTrue(admin_user.is_staff)
        self.assertEqual(admin_user.email, 'admin@example.com')


class TestUserAPI(APITestCase):
    """API tests for user operations."""

    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username='testuser',
            email='test@example.com',
            password='password123'  # Ensure this is the password used to log in
        )
        self.api_base_url = '/api/v1/users/'

    def test_register_user(self):
        url = self.api_base_url + 'register/'
        data = {
            "username": "newuser",
            "email": "newuser@example.com",
            "password": "newpassword123",
            "role": "student",
            "is_active": True
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNotNone(
            response.data['id'], "User ID should be returned in the response")

    def test_login_user(self):
        url = self.api_base_url + 'login/'
        data = {
            "email": "test@example.com",
            "password": "password123"
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('User logged in', response.data['success'])

    def test_logout_user(self):
        url = self.api_base_url + 'logout/'
        self.client.login(email='test@example.com', password='password123')
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('User logged out', response.data['success'])

    def test_user_detail_and_update(self):
        login_successful = self.client.login(
            email='test@example.com', password='password123')
        self.assertTrue(login_successful, "User login failed")

        user_id = self.user.id
        url = self.api_base_url + str(user_id) + '/'

        # Test GET detail
        get_response = self.client.get(url)
        self.assertEqual(get_response.status_code, status.HTTP_200_OK)

        # Test PATCH update for partial data update
        patch_data = json.dumps({"email": "updated@example.com"})
        patch_response = self.client.patch(
            url, patch_data, content_type='application/json')
        if patch_response.status_code != status.HTTP_200_OK:
            # Debug output to help diagnose the issue
            print(f"PATCH failed with data: {patch_response.data}")
        self.assertEqual(patch_response.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_response.data['email'], 'updated@example.com')

    def test_auth_check(self):
        url = self.api_base_url + 'auth/'
        self.client.login(email='test@example.com', password='password123')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'testuser')
        self.assertEqual(response.data['email'], 'test@example.com')
        self.assertTrue(response.data['is_authenticated'])
