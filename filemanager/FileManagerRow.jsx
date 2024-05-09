import React from "react";
import PropTypes from "prop-types";
import debug from "sabio-debug";
import { faUndoAlt, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "./filemanager.css";

const _logger = debug.extend("FilesRow");

function FileManagerRow({ theFile, onDeleteRequested, onRecoverRequested }) {
  _logger("This is a file object(FileManagerRow): ", theFile);

  const onLocalDeleteBtnClicked = (e) => {
    _logger("onLocalDeleteBtnClicked is firing.");
    _logger("The file we are deleting:", theFile);
    e.preventDefault();
    onDeleteRequested(theFile);
  };

  const onLocalRecoverBtnClicked = (e) => {
    _logger("onLocalRecoverBtnClicked is firing.");
    e.preventDefault();
    onRecoverRequested(theFile);
  };

  return (
    <React.Fragment>
      <tr key={theFile.id}>
        <td>{theFile.id}</td>
        <td>{theFile.name.slice(0, 20)}</td>
        <td>{theFile.fileType.name}</td>
        <td>
          <a className="url-font" href={theFile.url}>
            {theFile.url.slice(0, 20)}
          </a>
        </td>
        <td>
          {theFile.createdBy.firstName} {theFile.createdBy.lastName}
        </td>
        <td>{theFile.dateCreated.slice(0, 10)}</td>
        <td>
          <div className="container-for-buttons">
            <div className="spacer-1">
              <button
                type="button"
                className={
                  theFile.isDeleted
                    ? "btn btn-secondary undo-btn"
                    : "btn btn-danger trash-btn"
                }
                onClick={
                  theFile.isDeleted
                    ? onLocalRecoverBtnClicked
                    : onLocalDeleteBtnClicked
                }
              >
                {theFile.isDeleted ? (
                  <FontAwesomeIcon icon={faUndoAlt} />
                ) : (
                  <FontAwesomeIcon icon={faTrash} />
                )}
              </button>
            </div>
          </div>
        </td>
      </tr>
    </React.Fragment>
  );
}

export default FileManagerRow;

FileManagerRow.propTypes = {
  theFile: PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    url: PropTypes.string.isRequired,
    isDeleted: PropTypes.bool.isRequired,
    createdBy: PropTypes.shape({
      firstName: PropTypes.string.isRequired,
      lastName: PropTypes.string.isRequired,
    }),
    dateCreated: PropTypes.string.isRequired,
    fileType: PropTypes.shape({
      name: PropTypes.string.isRequired,
    }),
  }),
  onDeleteRequested: PropTypes.func.isRequired,
  onRecoverRequested: PropTypes.func.isRequired,
};
