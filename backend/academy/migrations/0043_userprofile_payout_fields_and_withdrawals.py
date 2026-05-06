from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('academy', '0042_alter_coursefeedback_id_alter_studentaccesslink_id_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='bank_account_holder',
            field=models.CharField(blank=True, max_length=120, null=True),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='bank_account_number',
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='bank_name',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='npwp',
            field=models.CharField(blank=True, max_length=32, null=True),
        ),
        migrations.CreateModel(
            name='InstructorWithdrawalRequest',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('amount', models.DecimalField(decimal_places=2, max_digits=12)),
                ('note', models.TextField(blank=True, null=True)),
                ('status', models.CharField(choices=[('PENDING', 'Menunggu Review'), ('APPROVED', 'Disetujui'), ('REJECTED', 'Ditolak'), ('PAID', 'Sudah Dicairkan')], default='PENDING', max_length=20)),
                ('accountant_notes', models.TextField(blank=True, null=True)),
                ('reviewed_at', models.DateTimeField(blank=True, null=True)),
                ('paid_at', models.DateTimeField(blank=True, null=True)),
                ('npwp_snapshot', models.CharField(blank=True, max_length=32, null=True)),
                ('bank_name_snapshot', models.CharField(blank=True, max_length=100, null=True)),
                ('bank_account_number_snapshot', models.CharField(blank=True, max_length=50, null=True)),
                ('bank_account_holder_snapshot', models.CharField(blank=True, max_length=120, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('instructor', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='withdrawal_requests', to='academy.instructor')),
                ('requested_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='instructor_withdrawal_requests', to=settings.AUTH_USER_MODEL)),
                ('reviewed_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='reviewed_withdrawal_requests', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at', '-id'],
            },
        ),
    ]
