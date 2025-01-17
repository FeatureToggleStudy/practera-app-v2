import * as filestack from 'filestack-js';
import { Injectable } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { PreviewComponent } from './preview/preview.component';
import { environment } from '@environments/environment';
import { BrowserStorageService } from '@services/storage.service';
import { HttpClient } from '@angular/common/http'; // added to make one and only API call to filestack server
import { Observable } from 'rxjs/Observable';
import { NotificationService } from '@shared/notification/notification.service';
import { UtilsService } from '@services/utils.service';

export interface Metadata {
  mimetype?: string;
  uploaded?: number;
  container?: string;
  writeable?: boolean;
  filename?: string;
  location?: string;
  key?: string;
  path?: string;
  size?: number;
}

// https://www.filestack.com/docs/api/file/#md-request
const api = {
  metadata: `https://www.filestackapi.com/api/file/HANDLE/metadata`
};

@Injectable()
export class FilestackService {
  private filestack: any;

  // file types that allowed to upload
  public fileTypes = {
    any: '',
    image: 'image/*',
    video: 'video/*'
  };

  constructor(
    private modalController: ModalController,
    private storage: BrowserStorageService,
    private httpClient: HttpClient,
    private notificationService: NotificationService,
    private utils: UtilsService
  ) {
    this.filestack = filestack.init(this.getFilestackConfig());

    if (!this.filestack) {
      throw new Error('Filestack module not found.');
    }
  }

  get client() {
    if (!this.filestack) {
      throw new Error('Filestack module not found.');
    }

    return this.filestack;
  }

  // get filestack config
  getFilestackConfig() {
    return environment.filestack.key;
  }

  // get file types
  getFileTypes(type = 'any') {
    return this.fileTypes[type];
  }

  // get s3 config
  getS3Config(fileType) {
    let path = environment.filestack.s3Config.paths.any;
    // get s3 path based on file type
    if (environment.filestack.s3Config.paths[fileType]) {
      path = environment.filestack.s3Config.paths[fileType];
    }
    // add user hash to the path
    path = path + this.storage.getUser().userHash + '/';
    return {
      location: environment.filestack.s3Config.location,
      container: environment.filestack.s3Config.container,
      region: environment.filestack.s3Config.region,
      path: path
    };
  }

  async previewFile(file) {
    let fileUrl = file.url;
    if (fileUrl) {
      if (fileUrl.indexOf('www.filepicker.io/api/file') !== -1) {
        // old format
        fileUrl = fileUrl.replace('www.filepicker.io/api/file', 'cdn.filestackcontent.com/preview');
      } else if (fileUrl.indexOf('filestackcontent.com') !== -1) {
        // new format
        fileUrl = fileUrl.replace('filestackcontent.com', 'filestackcontent.com/preview');
      }
    } else if (file.handle) {
      fileUrl = 'https://cdn.filestackcontent.com/preview/' + file.handle;
    }

    const metadata = await this.metadata(file);

    if (metadata.mimetype && metadata.mimetype.includes('application/')) {
      const megabyte = (metadata && metadata.size) ? metadata.size / 1000 / 1000 : 0;
      if (megabyte > 10) {
        return this.notificationService.alert({
          subHeader: 'File size too large',
          message: `Attachment size has exceeded the size of ${Math.floor(megabyte)}mb please consider downloading the file for better reading experience.`,
          buttons: [
            {
              text: 'Download',
              handler: () => {
                return this.utils.openUrl(file.url, {
                  target: '_blank',
                });
              }
            },
            {
              text: 'Cancel',
              role: 'cancel',
              handler: () => {
                return;
              }
            },
          ]
        });
      }
    }

    return new Promise(resolve => resolve(this.previewModal(fileUrl, file)));
  }

  async metadata(file): Promise<Metadata> {
    try {
      const handle = file.url.match(/([A-Za-z0-9]){20,}/);
      return this.httpClient.get(api.metadata.replace('HANDLE', handle[0])).toPromise();
    } catch (e) {
      console.log(`File url missing: ${JSON.stringify(e)}`);
      throw e;
    }
  }

  async open(options = {}, onSuccess = res => res, onError = err => err) {
    const pickerOptions: any = {
      dropPane: {},
      fromSources: [
        'local_file_system',
        'googledrive',
        'dropbox',
        'gmail',
        'video'
      ],
      storeTo: this.getS3Config(this.getFileTypes()),
      onFileSelected: data => {
        // replace space with underscore '_' in file name
        data.filename = data.filename.replace(/ /g, '_');
        return data;
      },
      onFileUploadFailed: onError,
      onFileUploadFinished: onSuccess,
    };

    return await this.filestack.picker(Object.assign(pickerOptions, options)).open();
  }

  async previewModal(url, filestackUploadedResponse?) {
    const modal = await this.modalController.create({
      component: PreviewComponent,
      componentProps: {
        url: url,
        file: filestackUploadedResponse, // for whole object reference
      }
    });
    return await modal.present();
  }
}
