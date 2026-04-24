from rest_framework import serializers
<<<<<<< HEAD
from .models import User
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
=======
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import User
from .models import Profile
>>>>>>> 6604d3b (Сделав имя, аватарку в профиле)

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    class Meta:
        model = User
        fields = ('username', 'first_name', 'last_name', 'email', 'password')
        extra_kwargs = {
            'username': {'required': False},
            'email': {'required': True}
        }
    
    def create(self, validated_data):
        email = validated_data.get('email')
        username = validated_data.get('username') or email
        
        user = User.objects.create_user(
            username=username,
            email=email,
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            password=validated_data['password']
        )
        return user
<<<<<<< HEAD

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        # Отримуємо стандартні дані (access та refresh токени)
        data = super().validate(attrs)

        # self.user з'являється після super().validate(attrs)
=======
    
class ProfileSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(source="user.first_name", required=False)
    last_name = serializers.CharField(source="user.last_name", required=False)
    email = serializers.EmailField(source="user.email", required=False)

    class Meta:
        model = Profile
        fields = ["first_name", "last_name", "email", "avatar"]

    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", {})

        user = instance.user
        user.first_name = user_data.get("first_name", user.first_name)
        user.last_name = user_data.get("last_name", user.last_name)
        user.email = user_data.get("email", user.email)
        user.save()

        if "avatar" in validated_data:
            instance.avatar = validated_data["avatar"]

        instance.save()
        return instance

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        USERNAME_FIELD = 'email'
        data = super().validate(attrs)
>>>>>>> 6604d3b (Сделав имя, аватарку в профиле)
        data['username'] = self.user.username
        data['first_name'] = self.user.first_name
        data['last_name'] = self.user.last_name
        data['email'] = self.user.email

        return data