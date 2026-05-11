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
    Works correctly even if username != email (legacy accounts).
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
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
                "No active account found with the given credentials"
            )

        # Ensure username == email (fix legacy accounts on the fly)
        if user.username != user.email:
            user.username = user.email
            user.save(update_fields=['username'])

        # Authenticate directly to avoid issues with mismatched USERNAME_FIELD
        authed = authenticate(
            request=self.context.get('request'),
            username=user.username,
            password=password,
        )
        if authed is None:
            raise serializers.ValidationError(
                "No active account found with the given credentials"
            )

        # Generate tokens via parent using the correct username
        attrs['username'] = user.username
        attrs.pop('email', None)

        data = super().validate(attrs)

        data['email']      = self.user.email
        data['username']   = self.user.email
        data['first_name'] = self.user.first_name
        data['last_name']  = self.user.last_name

        if hasattr(self.user, 'role') and self.user.role:
            data['role'] = self.user.role
        elif self.user.is_superuser or self.user.is_staff:
            data['role'] = 'admin'
        else:
            data['role'] = 'participant'

        return data