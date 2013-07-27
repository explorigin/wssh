(function() {
    var tSize;

    function TerminalSize() {
        var self = this,
            terminals = [],
            termEl, el, sizeCallback;

        this.characterBox = {
            width: 0,
            height: 0
        };

        this.availableHeight = function() {
            // Get the space available for text in the terminal window.
            // 40px = navbar height
            // 10px = terminal border
            return $(window).height() - 40 - 10;
        };

        this.availableWidth = function() {
            // Get the space available for text in the terminal window.
            // 10px = terminal border
            return $(window).width() - 10;
        };

        this.rows = function() {
            return Math.floor(self.availableHeight() / self.characterBox.height);
        }

        this.columns = function() {
            return Math.floor(self.availableWidth() / self.characterBox.width);
        }

        this.registerTerminal = function(term) {
            var index = terminals.length;
            $(term.element).data('tSizeindex', index);
            terminals.push(term);
            return index;
        };

        this.unregisterTerminal = function(term) {
            if (typeof term !== 'number') {
                term = $(term.element).data('tSizeindex');
            }
            terminals.splice(term, 1);
        };

        this.resizeTerminal = function(term) {
            if (typeof term === 'number') {
                term = terminals[term];
            }
            term.resize(self.columns(), self.rows());
        }

        this.resizeAllTerminals = function(term) {
            terminals.forEach(self.resizeTerminal);
        };

        // Determine character width
        function step1() {
            termEl = $('<div class="terminal"></div>').appendTo(document.body),
            el = $('<div style="visibility: hidden; display:inline-block">M</div>').appendTo(termEl),

            self.characterBox.width = el.innerWidth();
            self.characterBox.height = el.innerHeight();

            el.text("MM");

            setTimeout(step2, 0);
        }

        function step2() {
            self.characterBox.width = el.innerWidth() - self.characterBox.width;

            termEl.remove();

            if (sizeCallback) {
                sizeCallback();
            }
        }

        $(window).resize(function() {
            sizeCallback = self.resizeAllTerminals;
            step1();
        });

        setTimeout(step1, 0);
    }

    tSize = new TerminalSize();

    function openTerminal(options) {
        var client = new WSSHClient(),
            term = new Terminal(tSize.columns(), tSize.rows(), function(key) {
                client.send(key);
            });

        tSize.registerTerminal(term);

        term.open();
        term.write('Connecting...');

        client.connect($.extend(options, {
            onError: function(error) {
                term.write('Error: ' + error + '\r\n');
            },
            onConnect: function() {
                // Erase our connecting message
                term.write('\r');
            },
            onClose: function() {
                tSize.unregisterTerminal(term);
                $(term.element).remove();
                term.destroy();

                $('#ssh').hide();
                $('#connect').show();
            },
            onData: function(data) {
                term.write(data);
            }
        }));
    }

    $(function() {
        $('#ssh').hide();
        $('#private_key_authentication', '#connect').hide();

        $('input:radio[value=private_key]', '#connect').click(
            function() {
                $('#password_authentication').hide();
                $('#private_key_authentication').show();
            }
        );

        $('input:radio[value=password]', '#connect').click(
            function() {
                $('#password_authentication').show();
                $('#private_key_authentication').hide();
            }
        );

        $('#connect').submit(function(ev) {
            ev.preventDefault();

            function validate(fields) {
                var success = true;
                fields.forEach(function(field) {
                    if (!field.val()) {
                        field.closest('.control-group')
                            .addClass('error');
                        success = false;
                    }
                });
                return success;
            }

            // Clear errors
            $('.error').removeClass('error');

            var username = $('input:text#username');
            var hostname = $('input:text#hostname');

            $('.navbar .brand').text(username.val() + '@' + hostname.val());

            var authentication = $(
                'input[name=authentication_method]:checked',
                '#connect').val();

            var options = {
                username: username.val(),
                hostname: hostname.val(),
                authentication_method: authentication
            };

            if (authentication == 'password') {
                var password = $('input:password#password');
                if (!validate([username, hostname, password]))
                    return false;
                $.extend(options, {password: password.val()});
            } else if (authentication == 'private_key') {
                var private_key = $('textarea#private_key');
                if (!validate([username, hostname, private_key]))
                    return false;
                $.extend(options, {private_key: private_key.val()});
                var key_passphrase = $('input:password#key_passphrase');
                if (key_passphrase.val()) {
                    $.extend(options,
                        {key_passphrase: key_passphrase.val()});
                }
            }

            $('#connect').hide();
            $('#ssh').show();
            openTerminal(options);
        });
    });
})();
