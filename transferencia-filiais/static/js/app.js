// ─── File upload zones ───
function showFileName(input, labelId, zoneId) {
    const label = document.getElementById(labelId);
    const zone = document.getElementById(zoneId);
    if (input.files && input.files[0]) {
        label.textContent = '✓ ' + input.files[0].name;
        zone.classList.add('has-file');
    } else {
        label.textContent = '';
        zone.classList.remove('has-file');
    }
}

// Drag and drop support for upload zones
document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.upload-zone').forEach(function (zone) {
        zone.addEventListener('dragover', function (e) {
            e.preventDefault();
            zone.classList.add('drag-over');
        });
        zone.addEventListener('dragleave', function () {
            zone.classList.remove('drag-over');
        });
        zone.addEventListener('drop', function (e) {
            e.preventDefault();
            zone.classList.remove('drag-over');
            const input = zone.querySelector('input[type=file]');
            if (input && e.dataTransfer.files.length) {
                input.files = e.dataTransfer.files;
                const labelId = input.id.replace(/^/, 'name-');
                showFileName(input, 'name-' + input.id, 'zone-' + input.id);
            }
        });
    });

    // Loading overlay on form submit
    const form = document.getElementById('uploadForm');
    if (form) {
        form.addEventListener('submit', function () {
            const overlay = document.getElementById('loadingOverlay');
            if (overlay) overlay.classList.add('active');
        });
    }

    // Auto-dismiss alerts after 6 seconds
    document.querySelectorAll('.alert').forEach(function (alert) {
        setTimeout(function () {
            var bsAlert = bootstrap.Alert.getOrCreateInstance(alert);
            if (bsAlert) bsAlert.close();
        }, 6000);
    });
});
