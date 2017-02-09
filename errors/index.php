<?php

# We do have PHP, its first DirectoryIndex, lets server error page if we can
header('Cache-Control: max-age=90, public, must-revalidate, proxy-revalidate');

# Find error code we want to send, and appropriate HTTP status
# ... fallback to 403
$s = (isset($_GET['s']) && is_numeric($_GET['s']))?$_GET['s']:403;
$path = '/var/www/errors/'.$s.'.html';

http_response_code((int) $s);

# Include the file (should be file_get_contents #TODO).
if(file_exists($path)) {
  die(require($path));
}

# Fallback to index.html
require('/var/www/errors/index.html');

