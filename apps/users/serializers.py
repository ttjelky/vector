from rest_framework import serializers
from .models import User
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    role = serializers.CharField(required=False, default='participant')

    class Meta:
        model = User
        fields = ('username', 'first_name', 'last_name', 'email', 'password', 'role')
        extra_kwargs = {
            'username': {'required': False},
            'email':    {'required': True},
        }

    def create(self, validated_data):
        email    = validated_data.get('email')
        username = validated_data.get('username') or email
        role     = validated_data.pop('role', 'participant')

        user = User.objects.create_user(
            username=username,
            email=email,
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name',  ''),
            password=validated_data['password'],
        )

        if hasattr(user, 'role'):
            user.role = role
            user.save()

        return user


class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)

        data['username']   = self.user.username
        data['first_name'] = self.user.first_name
        data['last_name']  = self.user.last_name
        data['email']      = self.user.email

        # ── Визначення ролі ───────────────────────────────────────
        # Якщо на моделі User є поле role — беремо його напряму.
        # Якщо ні — fallback через is_staff / is_superuser.
        if hasattr(self.user, 'role') and self.user.role:
            data['role'] = self.user.role
        elif self.user.is_superuser or self.user.is_staff:
            data['role'] = 'admin'
        else:
            data['role'] = 'participant'   # дефолтна роль

        return data
