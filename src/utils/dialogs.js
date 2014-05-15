define([
    "hr/promise",
    "hr/dom",
    "hr/hr",
    "views/dialogs/base",
    "core/gitbookio",
    "core/settings"
], function (Q, $, hr, DialogView, gitbookIo, settings) {
    /**
     * Utils for managing modal dialogs
     *
     * @class
     */
    var Dialogs = {
        /**
         * Open a dialog from a specific view class with some configuration
         *
         * @param {DialogView} cls dialog view class
         * @param {options} options dialog view contructor options
         * @return {promise}
         */
        open: function(cls, options) {
            var d = Q.defer();

            cls = cls || DialogView;
            var diag = new cls(options);

            diag.once("close", function(result, e) {
                if (result != null) {
                    d.resolve(result);
                } else {
                    d.reject(result);
                }
            });
            setTimeout(function() {
                d.notify(diag);
            }, 1);
            diag.update();

            return d.promise;
        },

        /**
         * Open a form modal dialog with different field inputs
         *
         * @param {object} fields map of fields (standard with settings fields)
         */
        fields: function(title, fields, values) {
            return Dialogs.open(null, {
                "title": title,
                "fields": fields,
                "values": values || {},
                "dialog": "fields",
                "autoFocus": true,
                "valueSelector": function(that) {
                    var data = {};

                    var selectors = {
                        'text': function(el) { return el.val(); },
                        'password': function(el) { return el.val(); },
                        'textarea': function(el) { return el.val(); },
                        'number': function(el) { return el.val(); },
                        'select': function(el) { return el.val(); },
                        'checkbox': function(el) { return el.is(":checked"); },
                        'action': function(el)  { return null; }
                    };

                    _.each(that.options.fields, function(field, key) {
                        var v = selectors[field.type](that.$("*[name='"+ key+"']"));
                        if (v !== null) data[key] = v;
                    });
                    return data;
                }
            });
        },

        /**
         * Open a promt modal dialog
         *
         * @param {string} title
         * @param {string} message
         * @param {string} defaultmessage
         */
        prompt: function(title, message, defaultmsg) {
            return Dialogs.open(null, {
                "title": title,
                "message": message,
                "dialog": "prompt",
                "default": defaultmsg,
                "autoFocus": true,
                "valueSelector": "selectorPrompt"
            });
        },

        /**
         * Open a select modal dialog
         *
         * @param {string} title
         * @param {string} message
         * @param {boject} choices
         * @param {string} defaultChoice
         */
        select: function(title, message, choices, defaultChoice) {
            return Dialogs.open(null, {
                "title": title,
                "message": message,
                "dialog": "select",
                "default": defaultChoice,
                "choices": choices,
                "autoFocus": true,
                "valueSelector": "selectorPrompt"
            });
        },

        /**
         * Open a confirmation modal dialog
         *
         * @param {string} title
         * @param {string} message
         */
        confirm: function(title, message) {
            if (!message) {
                message = title;
                title = null;
            }

            return Dialogs.open(null, {
                "title": title,
                "message": message,
                "dialog": "confirm"
            });
        },

        /**
         * Open an alert modal dialog
         *
         * @param {string} title
         * @param {string} message
         */
        alert: function(title, message) {
            return Dialogs.open(null, {
                "title": title,
                "message": message,
                "dialog": "alert"
            });
        },

        /**
         * File dialog
         *
         * @param {string} base name
         */
        file: function(props) {
            var that = this;
            var d = Q.defer();

            var $f = $("input.file-dialog");
            if ($f.length > 0) $f.remove();

            $f = $("<input>", {
                "type": "file",
                "class": "file-dialog"
            });
            $f.appendTo($("body"));
            $f.hide();

            $f.prop(props);

            // Create file element for selection
            $f.one("change", function(e) {
                e.preventDefault();

                var _path = $f.val();

                if (_path) d.resolve(_path);
                else d.reject(new Error("No file selected"));

                $f.remove();
            });

            $f.trigger('click');

            return d.promise;
        },

        /**
         * Save as
         *
         * @param {string} base name
         */
        saveAs: function(path, basePath) {
            return Dialogs.file({
                nwsaveas: path,
                nwworkingdir: basePath
            });
        },

        /**
         * Open folder selection
         */
        folder: function() {
            return Dialogs.file({
                nwdirectory: true
            });
        },

        error: function(err) {
            Dialogs.alert("Error:", err.message || err);
            return Q.reject(err);
        },

        /*
         *  Settings dialog
         */
        settings: function() {
            return Dialogs.fields("Advanced Settings", {
                autoFileManagement: {
                    label: "Auto file management",
                    type: "checkbox"
                },
                username: {
                    label: "Username",
                    type: "text"
                },
                token: {
                    label: "Token",
                    type: "text"
                },
                host: {
                    label: "Host",
                    type: "text"
                }
            }, settings.toJSON())
            .then(function(values) {
                settings.set(values);
                settings.setStateToStorage();
            });
        },

        /*
         *  Auth dialog
         */
        connectAccount: function() {
            return Dialogs.fields("Connect your GitBook.io account", {
                username: {
                    label: "Username or Email",
                    type: "text"
                },
                password: {
                    label: "Password",
                    type: "password"
                }
            }, {})
            .then(function(auth) {
                return gitbookIo.login(auth.username, auth.password);
            })
            .then(function() {
                settings.set("username", gitbookIo.config.auth.username);
                settings.set("token", gitbookIo.config.auth.password);
                settings.setStateToStorage();
            })
            .then(function() {
                Dialogs.alert("Account connected", "You're account is now connected to this computer.");
            }, Dialogs.error)
        }
    };

    return Dialogs;
});