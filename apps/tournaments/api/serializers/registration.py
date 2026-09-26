from rest_framework import serializers
from ...models import RegistrationField, RegistrationResponse, FIELD_TYPE_CHOICES
from ...models.registration import CHOICE_TYPES


class RegistrationFieldSerializer(serializers.ModelSerializer):
    class Meta:
        model = RegistrationField
        fields = ['id', 'tournament', 'label', 'field_type', 'required',
                  'options', 'placeholder', 'order']
        read_only_fields = ['id', 'tournament']

    def validate(self, attrs):
        ftype = attrs.get('field_type', getattr(self.instance, 'field_type', 'text'))
        options = attrs.get('options', getattr(self.instance, 'options', []))
        if ftype in CHOICE_TYPES:
            if not isinstance(options, list) or len([o for o in options if str(o).strip()]) < 2:
                raise serializers.ValidationError(
                    {"options": "Для списку/радіо/чекбоксу потрібно мінімум 2 варіанти."}
                )
            # нормалізуємо
            attrs['options'] = [str(o).strip() for o in options if str(o).strip()]
        else:
            attrs['options'] = []
        label = attrs.get('label', getattr(self.instance, 'label', ''))
        if not str(label or '').strip():
            raise serializers.ValidationError({"label": "Назва поля обов'язкова."})
        return attrs


class RegistrationResponseSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.SerializerMethodField()
    answers_display = serializers.SerializerMethodField()

    class Meta:
        model = RegistrationResponse
        fields = ['id', 'tournament', 'user', 'user_email', 'user_name',
                  'answers', 'answers_display', 'submitted_at', 'updated_at']
        read_only_fields = ['id', 'tournament', 'user', 'submitted_at', 'updated_at']

    def get_user_name(self, obj):
        full = f"{obj.user.first_name or ''} {obj.user.last_name or ''}".strip()
        return full or obj.user.username

    def get_answers_display(self, obj):
        # [{label, value}] для зручного рендеру
        fields = {f.id: f for f in RegistrationField.objects.filter(tournament=obj.tournament)}
        out = []
        for fid, val in (obj.answers or {}).items():
            try:
                fid_int = int(fid)
            except (ValueError, TypeError):
                continue
            field = fields.get(fid_int)
            if not field:
                continue
            if isinstance(val, list):
                value = ", ".join(str(v) for v in val)
            else:
                value = str(val) if val is not None else ""
            out.append({"field_id": fid_int, "label": field.label,
                        "type": field.field_type, "value": value})
        return out


def validate_answers(tournament, answers):
    """
    Перевіряє answers {field_id: value} проти полів турніру.
    Повертає нормалізований dict {str(field_id): value}.
    Raises serializers.ValidationError.
    """
    from ...models import RegistrationField
    fields = list(RegistrationField.objects.filter(tournament=tournament))
    if not fields and answers:
        raise serializers.ValidationError("Цей турнір не має форми реєстрації.")
    norm = {}
    errors = {}
    for f in fields:
        raw = None
        # answers може мати ключі str або int
        if answers is not None:
            if str(f.id) in answers:
                raw = answers[str(f.id)]
            elif f.id in answers:
                raw = answers[f.id]
        empty = raw is None or raw == "" or raw == []
        if empty and f.required:
            errors[str(f.id)] = f"Поле «{f.label}» обов'язкове."
            continue
        if empty:
            continue
        # Валідація по типах
        if f.field_type == 'number':
            try:
                float(raw)
            except (ValueError, TypeError):
                errors[str(f.id)] = f"Поле «{f.label}» має бути числом."
                continue
        elif f.field_type in ('select', 'radio'):
            if str(raw) not in [str(o) for o in f.options]:
                errors[str(f.id)] = f"Невірне значення для «{f.label}»."
                continue
            raw = str(raw)
        elif f.field_type == 'checkbox':
            if not isinstance(raw, list):
                errors[str(f.id)] = f"Поле «{f.label}» має бути списком."
                continue
            bad = [v for v in raw if str(v) not in [str(o) for o in f.options]]
            if bad:
                errors[str(f.id)] = f"Невірні варіанти для «{f.label}»."
                continue
            raw = [str(v) for v in raw]
        else:
            raw = str(raw)
        norm[str(f.id)] = raw
    if errors:
        raise serializers.ValidationError(errors)
    return norm
