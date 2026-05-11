from rest_framework import serializers
from .models import User
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import authenticate


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    role = serializers.CharField(required=False, default='participant')

    class Meta:
        model = User
        fields = ('first_name', 'last_name', 'email', 'password', 'role')
        extra_kwargs = {
            'email': {'required': True},
        }

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("user with this email already exists")
        return value

    def create(self, validated_data):
        email    = validated_data['email']
        password = validated_data['password']
        role     = validated_data.pop('role', 'participant')

        user = User.objects.create_user(
            username=email,
            email=email,
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            password=password,
        )

        user.role = role
        user.save()

        return user


class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Accept { email, password } instead of { username, password }.
    We look up the user by email, then let the parent handle
    password validation and token generation normally.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Swap out the 'username' field for 'email'
        self.fields.pop('username', None)
        self.fields['email'] = serializers.EmailField(required=True)

    def validate(self, attrs):
        email    = attrs.get('email', '').strip().lower()
        password = attrs.get('password', '')

        # Look up user by email
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            raise serializers.ValidationError(
                {'email': 'No account found with this email.'}
            )

        # Re-inject as 'username' so the parent validator can authenticate
        attrs['username'] = user.username
        # Remove our custom field so parent doesn't choke on unknown keys
        attrs.pop('email', None)

        data = super().validate(attrs)

        # Enrich the token response
        data['email']      = self.user.email
        data['username']   = self.user.email   # expose email as username to frontend
        data['first_name'] = self.user.first_name
        data['last_name']  = self.user.last_name

        if hasattr(self.user, 'role') and self.user.role:
            data['role'] = self.user.role
        elif self.user.is_superuser or self.user.is_staff:
            data['role'] = 'admin'
        else:
            data['role'] = 'participant'

        return data